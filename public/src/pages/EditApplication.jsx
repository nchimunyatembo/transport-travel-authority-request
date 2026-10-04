import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateAuthority from './CreateAuthority';
import CreateRequest from './CreateRequest';
import api from '../utils/api';

export default function EditApplication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/requests/${id}`)
      .then((response) => {
        if (!response.data.request.can_edit) {
          setError('This application can no longer be edited.');
          return;
        }
        setRequest(response.data.request);
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || 'Could not load this application.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={styles.message}>Loading application...</div>;
  if (error) {
    return (
      <div style={styles.message}>
        <p>{error}</p>
        <button onClick={() => navigate(`/requests/${id}`)}>Back to application</button>
      </div>
    );
  }

  return request.application_type === 'duty travel'
    ? <CreateAuthority requestToEdit={request} />
    : <CreateRequest requestToEdit={request} />;
}

const styles = {
  message: { maxWidth: '700px', margin: '40px auto', padding: '24px', color: '#334155', textAlign: 'center' }
};